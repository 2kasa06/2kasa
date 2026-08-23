<?php
/**
 * トップページ。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();

$bp_title = bp_split_lines( bp_option( 'bp_hero_title', "あなたらしい美しさを、\nもっと自由に。" ) );
$bp_hero  = bp_option( 'bp_hero_image' );
$bp_hero  = $bp_hero ? $bp_hero : bp_asset_image( 'hero-illustration.webp' );

$bp_stats = array(
	array( bp_option( 'bp_stat1_num', '1,200+' ), bp_option( 'bp_stat1_label', '累計お客様数' ) ),
	array( bp_option( 'bp_stat2_num', '98%' ), bp_option( 'bp_stat2_label', '満足度' ) ),
	array( bp_option( 'bp_stat3_num', '10年+' ), bp_option( 'bp_stat3_label', '実績' ) ),
);
?>

<section class="bp-hero">
	<span class="float-shape animate-float-1" style="top:-100px;left:-100px;width:400px;height:400px;opacity:.2;background:radial-gradient(circle, hsl(8,40%,65%) 0%, transparent 70%);" aria-hidden="true"></span>
	<span class="float-shape animate-float-2" style="bottom:10%;left:5%;width:300px;height:300px;opacity:.15;background:radial-gradient(circle, hsl(8,50%,88%) 0%, transparent 70%);" aria-hidden="true"></span>
	<span class="float-shape animate-float-3" style="top:30%;left:40%;width:200px;height:200px;opacity:.1;background:radial-gradient(circle, hsl(45,55%,60%) 0%, transparent 70%);" aria-hidden="true"></span>

	<svg style="position:absolute;inset:0;width:100%;height:100%;opacity:.1;pointer-events:none;" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
		<circle cx="200" cy="200" r="150" stroke="hsl(8,40%,65%)" stroke-width="0.5" />
		<circle cx="200" cy="200" r="250" stroke="hsl(8,40%,65%)" stroke-width="0.3" />
		<path d="M 100 600 Q 400 400 700 500 T 1300 300" stroke="hsl(8,40%,65%)" stroke-width="0.5" fill="none" />
		<circle cx="1200" cy="700" r="100" stroke="hsl(8,50%,88%)" stroke-width="0.5" />
	</svg>

	<div class="bp-hero__media" data-bp-parallax>
		<img src="<?php echo esc_url( $bp_hero ); ?>" alt="" />
	</div>
	<div class="bp-hero__veil" aria-hidden="true"></div>

	<div class="container bp-hero__inner">
		<div class="bp-hero__body">
			<p class="section-label bp-eyebrow reveal-left"><?php echo esc_html( bp_option( 'bp_eyebrow', 'Beauty Produce' ) ); ?></p>

			<h1 class="bp-hero__title reveal-left" style="transition-delay:120ms;">
				<?php echo esc_html( $bp_title['first'] ); ?>
				<?php if ( $bp_title['em'] ) : ?>
					<br /><em><?php echo esc_html( $bp_title['em'] ); ?></em>
				<?php endif; ?>
			</h1>

			<p class="bp-hero__lead reveal-left" style="transition-delay:240ms;"><?php echo esc_html( bp_option( 'bp_hero_lead', '人生のステージごとに変化する美しさ・自信・魅力に寄り添う、あなただけの美容プロデュースサービス。' ) ); ?></p>

			<div class="bp-btn-row reveal-left" style="transition-delay:360ms;">
				<a class="btn-primary" href="<?php echo esc_url( bp_reserve_link() ); ?>">
					無料カウンセリングを予約する
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
				</a>
				<a class="btn-outline" href="#age-select">あなたのステージを選ぶ</a>
			</div>

			<dl class="bp-stats reveal-left" style="transition-delay:480ms;">
				<?php foreach ( $bp_stats as $bp_stat ) : ?>
					<div>
						<dt><?php echo esc_html( $bp_stat[0] ); ?></dt>
						<dd><?php echo esc_html( $bp_stat[1] ); ?></dd>
					</div>
				<?php endforeach; ?>
			</dl>
		</div>
	</div>

	<a class="bp-scroll-cue" href="#age-select" aria-label="下へスクロール">
		<span>scroll</span>
		<i aria-hidden="true"></i>
	</a>
</section>

<?php
get_template_part( 'template-parts/section-ages' );
get_template_part( 'template-parts/section-services' );
get_template_part( 'template-parts/section-brand' );
get_template_part( 'template-parts/section-before-after' );
get_template_part( 'template-parts/section-voice' );
get_template_part( 'template-parts/section-flow' );
get_template_part( 'template-parts/section-faq' );
get_template_part( 'template-parts/section-booking' );

get_footer();
