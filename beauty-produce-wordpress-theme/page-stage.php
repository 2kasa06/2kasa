<?php
/**
 * Template Name: 年代別ページ
 * Description: 10代〜20代・30代・40代・50代〜60代などの年代別ページ用テンプレートです。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();

while ( have_posts() ) :
	the_post();

	$bp_page_id  = get_the_ID();
	$bp_range    = get_post_meta( $bp_page_id, 'bp_age_range', true );
	$bp_range    = $bp_range ? $bp_range : get_the_title();
	$bp_label    = get_post_meta( $bp_page_id, 'bp_age_label', true );
	$bp_catch    = get_post_meta( $bp_page_id, 'bp_age_catch', true );
	$bp_lead     = get_post_meta( $bp_page_id, 'bp_age_lead', true );
	$bp_concerns = bp_parse_lines( get_post_meta( $bp_page_id, 'bp_age_concerns', true ) );
	$bp_scenes   = bp_parse_lines( get_post_meta( $bp_page_id, 'bp_age_scenes', true ) );
	$bp_services = (array) get_post_meta( $bp_page_id, 'bp_age_services', true );
	?>

	<section class="bp-page-hero">
		<?php get_template_part( 'template-parts/shapes' ); ?>

		<div class="bp-container bp-page-hero__grid">
			<div>
				<nav class="bp-breadcrumb" aria-label="パンくずリスト">
					<a href="<?php echo esc_url( home_url( '/' ) ); ?>">ホーム</a>
					<span aria-hidden="true">/</span>
					<?php echo esc_html( $bp_range ); ?>
				</nav>

				<?php if ( $bp_label ) : ?>
					<p class="section-label reveal-left"><?php echo esc_html( $bp_label ); ?></p>
				<?php endif; ?>

				<h1 class="bp-page-hero__title reveal-left" style="transition-delay:80ms;">
					<?php echo esc_html( $bp_range ); ?>のあなたへ
				</h1>

				<?php if ( $bp_catch ) : ?>
					<p class="bp-page-hero__catch reveal-left" style="transition-delay:150ms;"><?php echo esc_html( $bp_catch ); ?></p>
				<?php endif; ?>

				<?php if ( $bp_lead ) : ?>
					<p class="section-subtitle reveal-left" style="transition-delay:220ms;max-width:36rem;"><?php echo esc_html( $bp_lead ); ?></p>
				<?php endif; ?>

				<div class="btn-row reveal-left" style="margin-top:2.5rem;transition-delay:300ms;">
					<a class="btn-primary" href="<?php echo esc_url( bp_reserve_link() ); ?>">この年代の相談をする</a>
					<a class="btn-outline" href="#age-services">おすすめメニュー</a>
				</div>
			</div>

			<div class="bp-hero__figure reveal-right">
				<img src="<?php echo esc_url( bp_age_image_url( $bp_page_id ) ); ?>"
					alt="<?php echo esc_attr( $bp_range . '向けのイメージイラスト' ); ?>" width="800" height="800" />
			</div>
		</div>
	</section>

	<?php if ( $bp_concerns ) : ?>
		<section class="bp-section bp-section--white">
			<div class="bp-container">
				<div class="bp-heading bp-heading--center reveal">
					<p class="section-label">CONCERNS</p>
					<h2 class="section-title">よくいただくお悩み</h2>
					<p class="section-subtitle"><?php echo esc_html( $bp_range ); ?>の方から特に多くいただくご相談です。ひとつでも当てはまれば、解決の糸口をご用意できます。</p>
				</div>

				<div class="bp-grid bp-grid--2 bp-mt-lg">
					<?php foreach ( $bp_concerns as $bp_index => $bp_concern ) : ?>
						<div class="card-glow bp-concern reveal" style="transition-delay:<?php echo (int) ( ( $bp_index % 2 ) * 90 ); ?>ms;">
							<span class="bp-concern__num" aria-hidden="true"><?php echo esc_html( str_pad( (string) ( $bp_index + 1 ), 2, '0', STR_PAD_LEFT ) ); ?></span>
							<div>
								<h3><?php echo esc_html( $bp_concern['title'] ); ?></h3>
								<?php if ( $bp_concern['body'] ) : ?>
									<p><?php echo esc_html( $bp_concern['body'] ); ?></p>
								<?php endif; ?>
							</div>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
		</section>
	<?php endif; ?>

	<?php
	get_template_part(
		'template-parts/section-services',
		null,
		array(
			'ids'      => $bp_services,
			'label'    => 'RECOMMENDED',
			'title'    => $bp_range . 'におすすめのメニュー',
			'subtitle' => 'この年代で得られる効果が大きい順にご紹介します。もちろん他のメニューもご利用いただけます。',
			'columns'  => 3,
			'anchor'   => 'age-services',
			'tone'     => 'ivory',
		)
	);
	?>

	<?php if ( $bp_scenes ) : ?>
		<section class="bp-section bp-section--white">
			<?php get_template_part( 'template-parts/shapes' ); ?>

			<div class="bp-container">
				<div class="bp-heading bp-heading--center reveal">
					<p class="section-label">SCENE</p>
					<h2 class="section-title">こんな場面で役立ちます</h2>
					<p class="section-subtitle">診断結果は、日常のさまざまな場面で使えます。予定に合わせた具体的な使い方までお伝えします。</p>
				</div>

				<div class="bp-grid bp-grid--4 bp-mt-lg">
					<?php foreach ( $bp_scenes as $bp_index => $bp_scene ) : ?>
						<div class="bp-scene reveal" style="transition-delay:<?php echo (int) ( ( $bp_index % 4 ) * 80 ); ?>ms;">
							<span class="bp-rule" aria-hidden="true"></span>
							<h3><?php echo esc_html( $bp_scene['title'] ); ?></h3>
							<?php if ( $bp_scene['body'] ) : ?>
								<p><?php echo esc_html( $bp_scene['body'] ); ?></p>
							<?php endif; ?>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
		</section>
	<?php endif; ?>

	<?php if ( trim( get_the_content() ) ) : ?>
		<section class="bp-section bp-section--white">
			<div class="bp-container bp-container--narrow bp-entry__content reveal">
				<?php the_content(); ?>
			</div>
		</section>
	<?php endif; ?>

	<?php
	get_template_part( 'template-parts/section-flow' );
	get_template_part( 'template-parts/section-before-after' );
	get_template_part( 'template-parts/section-voice' );
	get_template_part( 'template-parts/section-faq' );

	get_template_part(
		'template-parts/section-ages',
		null,
		array(
			'exclude'  => $bp_page_id,
			'label'    => 'OTHER AGES',
			'title'    => '',
			'subtitle' => '',
			'wide'     => true,
			'anchor'   => 'other-ages',
			'tone'     => 'ivory',
		)
	);

	get_template_part( 'template-parts/section-contact' );

	get_template_part(
		'template-parts/section-cta',
		null,
		array(
			'title' => $bp_range . 'の「似合う」を、見つけにきませんか。',
			'body'  => '所要時間や料金のご相談だけでも構いません。まずはお気軽にお問い合わせください。',
		)
	);

endwhile;

get_footer();
