<?php
/**
 * 年代選択セクション。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_args = wp_parse_args(
	isset( $args ) ? $args : array(),
	array(
		'exclude'  => 0,
		'label'    => 'BY AGE',
		'title'    => '年代から選ぶ',
		'subtitle' => '同じ「似合う」でも、必要なものは年代で変わります。いまのご自身に近いところからご覧ください。',
		'wide'     => false,
		'anchor'   => 'ages',
		'tone'     => 'white',
	)
);

$bp_pages = bp_get_age_pages();

if ( $bp_args['exclude'] ) {
	$bp_pages = array_values(
		array_filter(
			$bp_pages,
			static function ( $bp_page ) use ( $bp_args ) {
				return (int) $bp_page->ID !== (int) $bp_args['exclude'];
			}
		)
	);
}

if ( ! $bp_pages ) {
	return;
}

$bp_columns = count( $bp_pages ) >= 4 ? 4 : 3;
?>
<section id="<?php echo esc_attr( $bp_args['anchor'] ); ?>" class="bp-section bp-section--<?php echo esc_attr( $bp_args['tone'] ); ?>">
	<?php get_template_part( 'template-parts/shapes' ); ?>

	<div class="bp-container">
		<div class="bp-heading bp-heading--center reveal">
			<p class="section-label"><?php echo esc_html( $bp_args['label'] ); ?></p>
			<?php if ( $bp_args['title'] ) : ?>
				<h2 class="section-title"><?php echo esc_html( $bp_args['title'] ); ?></h2>
			<?php endif; ?>
			<?php if ( $bp_args['subtitle'] ) : ?>
				<p class="section-subtitle"><?php echo esc_html( $bp_args['subtitle'] ); ?></p>
			<?php endif; ?>
		</div>

		<div class="bp-grid bp-grid--<?php echo (int) $bp_columns; ?> bp-mt-lg">
			<?php foreach ( $bp_pages as $bp_index => $bp_page ) : ?>
				<?php
				$bp_range = get_post_meta( $bp_page->ID, 'bp_age_range', true );
				$bp_range = $bp_range ? $bp_range : get_the_title( $bp_page );
				$bp_label = get_post_meta( $bp_page->ID, 'bp_age_label', true );
				$bp_card  = get_post_meta( $bp_page->ID, 'bp_age_card', true );
				?>
				<a class="age-card<?php echo $bp_args['wide'] ? ' age-card--wide' : ''; ?> reveal"
					href="<?php echo esc_url( get_permalink( $bp_page ) ); ?>"
					style="transition-delay:<?php echo (int) ( $bp_index * 90 ); ?>ms;">
					<img src="<?php echo esc_url( bp_age_image_url( $bp_page->ID ) ); ?>" alt="<?php echo esc_attr( $bp_range . 'のページ' ); ?>" loading="lazy" />
					<span class="age-card__body">
						<?php if ( $bp_label ) : ?>
							<span class="age-card__label"><?php echo esc_html( $bp_label ); ?></span>
						<?php endif; ?>
						<span class="age-card__title"><?php echo esc_html( $bp_range ); ?></span>
						<?php if ( $bp_card && ! $bp_args['wide'] ) : ?>
							<span class="age-card__copy"><?php echo esc_html( $bp_card ); ?></span>
						<?php endif; ?>
					</span>
				</a>
			<?php endforeach; ?>
		</div>
	</div>
</section>
